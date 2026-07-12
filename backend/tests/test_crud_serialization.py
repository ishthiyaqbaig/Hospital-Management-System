import unittest

from app.services.crud import serialize_document


class CrudSerializationTests(unittest.TestCase):
    def test_serialize_document_backfills_timestamps_for_legacy_departments(self):
        document = {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Emergency",
            "description": "Urgent care",
        }

        payload = serialize_document(document)

        self.assertEqual(payload["id"], "507f1f77bcf86cd799439011")
        self.assertIn("created_at", payload)
        self.assertIn("updated_at", payload)
        self.assertGreaterEqual(payload["updated_at"], payload["created_at"])

    def test_serialize_document_backfills_license_number_for_legacy_doctors(self):
        document = {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Dr. Maya Patel",
            "email": "doctor@mediflow.ai",
            "specialization": "Internal Medicine",
            "availability": ["monday", "tuesday"],
        }

        payload = serialize_document(document)

        self.assertEqual(payload["license_number"], "")


if __name__ == "__main__":
    unittest.main()
