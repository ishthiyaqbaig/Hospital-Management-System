import unittest
from datetime import datetime

from app.services.appointments import assign_queue_positions


class EmergencyQueueTests(unittest.TestCase):
    def test_higher_emergency_urgency_comes_first(self):
        items = [
            {"id": "a", "queue_position": 1, "emergency_urgency": 2, "scheduled_at": datetime(2026, 7, 11, 9, 0)},
            {"id": "b", "queue_position": 2, "emergency_urgency": 5, "scheduled_at": datetime(2026, 7, 11, 9, 15)},
            {"id": "c", "queue_position": 3, "scheduled_at": datetime(2026, 7, 11, 8, 30)},
        ]
        ordered = assign_queue_positions(items)
        self.assertEqual([item["id"] for item in ordered], ["b", "a", "c"])

    def test_non_emergency_items_keep_time_order(self):
        items = [
            {"id": "a", "queue_position": 1, "scheduled_at": datetime(2026, 7, 11, 10, 0)},
            {"id": "b", "queue_position": 2, "scheduled_at": datetime(2026, 7, 11, 9, 0)},
        ]
        ordered = assign_queue_positions(items)
        self.assertEqual([item["id"] for item in ordered], ["b", "a"])


if __name__ == "__main__":
    unittest.main()
