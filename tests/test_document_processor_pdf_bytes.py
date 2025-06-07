import base64
import unittest

from tools.document_processing.document_processor import DocumentProcessor

# Minimal PDF with the text 'Hello' encoded in base64 to avoid binary files
PDF_B64 = (
    "JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIg"
    "MCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBv"
    "YmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzMDAgMTQ0XSAvQ29u"
    "dGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2Jq"
    "CjQgMCBvYmoKPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCAxMDAgVGQKKEhl"
    "bGxvKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUg"
    "L1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1"
    "NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTE1IDAw"
    "MDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKMDAwMDAwMDMxNSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9S"
    "b290IDEgMCBSIC9TaXplIDYgPj4Kc3RhcnR4cmVmCjM1MQolJUVPRg=="
)


class TestPDFProcessingFromBytes(unittest.TestCase):
    def test_process_pdf_from_bytes(self):
        processor = DocumentProcessor()
        pdf_bytes = base64.b64decode(PDF_B64)
        result = processor.process_document(content=pdf_bytes, file_type="pdf")
        self.assertIn("Hello", result.get("text", ""))


if __name__ == "__main__":
    unittest.main()
