import unittest

from app.services.billing import build_default_items, build_receipt_pdf, calculate_amount


class BillingServiceTests(unittest.TestCase):
    def test_calculate_amount_sums_itemized_charges(self):
        items = [
            {"description": "Consultation", "quantity": 1, "unit_price": 100.0},
            {"description": "Prescription", "quantity": 1, "unit_price": 15.0},
        ]
        self.assertEqual(calculate_amount([type("Item", (), item)() for item in items]), 115.0)

    def test_receipt_pdf_is_generated(self):
        pdf_bytes = build_receipt_pdf({
            "id": "bill_123",
            "patient_id": "patient_1",
            "status": "pending",
            "currency": "USD",
            "amount": 115.0,
            "items": [{"description": "Consultation", "quantity": 1, "unit_price": 100.0}],
        })
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 100)

    def test_default_items_include_appointment_and_prescription_charges(self):
        items = build_default_items(appointment_id="apt_1", prescription_id="rx_1")
        self.assertEqual(len(items), 3)
        descriptions = [item.description for item in items]
        self.assertIn("Consultation fee", descriptions)
        self.assertIn("Prescription dispensing fee", descriptions)


if __name__ == "__main__":
    unittest.main()
