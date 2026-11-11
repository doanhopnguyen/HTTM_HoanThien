import unittest
from worker import AlertGate, canonical_label


class AlertTests(unittest.TestCase):
    def test_only_drowning_classes_raise_alerts(self):
        self.assertEqual(canonical_label("Drowning"), "drown")
        self.assertEqual(canonical_label("drown"), "drown")
        for label in ["Not Drowning", "person", "person_in_water", "swim", "non-drowning"]:
            self.assertNotEqual(canonical_label(label), "drown")

    def test_requires_temporal_votes_and_delivery_cooldown(self):
        gate = AlertGate(0.6)
        for frame in range(7):
            self.assertIsNone(gate.observe([0.9], frame))
        self.assertEqual(gate.observe([0.9], 7), 0.9)
        gate.sent(7)
        self.assertIsNone(gate.observe([0.95], 8))
        self.assertEqual(gate.observe([0.95], 37), 0.95)
        self.assertIsNone(gate.observe([], 38))

    def test_low_confidence_and_absent_boxes_do_not_alert(self):
        gate = AlertGate(0.7)
        for frame in range(40):
            self.assertIsNone(gate.observe([0.69] if frame % 2 else [], frame))


if __name__ == "__main__":
    unittest.main()
