import csv
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

class DescriptionImport(unittest.TestCase):
    def run_import(self, rows, existing=None):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'tools/accessibility').mkdir(parents=True)
            (root/'content/timeline').mkdir(parents=True)
            script=root/'tools/accessibility/import-descriptions.py'
            shutil.copyfile('tools/accessibility/import-descriptions.py',script)
            gallery={'images':['photo.jpg']}
            if existing is not None: gallery['imageDescriptions']=[existing]
            target=root/'content/timeline/galleries.json'
            target.write_text(json.dumps({'entries':{'event':gallery}}))
            original=target.read_bytes()
            csv_path=root/'reviewed.csv'
            with csv_path.open('w',newline='') as f:
                writer=csv.DictWriter(f,fieldnames=['post','billednummer','billedsti','beskrivelse','status'])
                writer.writeheader();writer.writerows(rows)
            result=subprocess.run(['python3',str(script),str(csv_path)],capture_output=True)
            return result.returncode,json.loads(target.read_text()),target.read_bytes()==original
    def row(self, **changes):
        return {'post':'event','billednummer':'1','billedsti':'photo.jpg','beskrivelse':'En person ved en mikrofon.','status':'Godkendt',**changes}
    def test_reviewed(self):
        code,data,_=self.run_import([self.row()]);self.assertEqual(code,0);self.assertEqual(data['entries']['event']['imageDescriptions'],['En person ved en mikrofon.'])
    def test_unreviewed(self):
        code,_,unchanged=self.run_import([self.row(status='Skal gennemgås')]);self.assertEqual(code,0);self.assertTrue(unchanged)
    def test_invalid_batch_atomic(self):
        code,_,unchanged=self.run_import([self.row(),self.row(billednummer='2')]);self.assertNotEqual(code,0);self.assertTrue(unchanged)
    def test_path_mismatch(self):
        code,_,unchanged=self.run_import([self.row(billedsti='other.jpg')]);self.assertNotEqual(code,0);self.assertTrue(unchanged)
    def test_conflicting_existing(self):
        code,_,unchanged=self.run_import([self.row()],existing='Anden beskrivelse.');self.assertNotEqual(code,0);self.assertTrue(unchanged)
    def test_duplicate(self):
        code,_,unchanged=self.run_import([self.row(),self.row()]);self.assertNotEqual(code,0);self.assertTrue(unchanged)

if __name__=='__main__': unittest.main()
