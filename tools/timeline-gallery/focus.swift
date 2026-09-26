// Offline face bounds; normalized coordinates use a top-left origin.
import Foundation
import Vision
import AppKit
let files = try JSONDecoder().decode([String].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
var output: [String: [[Double]]] = [:]
for (index, file) in files.enumerated() {
    autoreleasepool {
        guard let image = NSImage(contentsOfFile: file), let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
        let request = VNDetectFaceRectanglesRequest()
        request.usesCPUOnly = true
        do {
            try VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
            let faces = (request.results ?? []).filter { $0.confidence > 0.65 }.map { face -> [Double] in
                let r = face.boundingBox
                return [r.minX, 1-r.maxY, r.width, r.height]
            }
            if !faces.isEmpty { output[file] = faces }
        } catch { if index < 3 { fputs("Vision error: \(error)\n", stderr) } }
    }
    if index % 100 == 0 { fputs("Processed \(index)/\(files.count)\n", stderr) }
}
try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys]).write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
print("Detected faces in \(output.count) pictures")
