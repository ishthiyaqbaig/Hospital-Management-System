const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function buildSlots(dateValue) {
  if (!dateValue) {
    return [];
  }
  const slots = [];
  for (let hour = 9; hour < 17; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${dateValue}T${String(hour).padStart(2, "0")}:${String(
        minute
      ).padStart(2, "0")}`;
      slots.push(value);
    }
  }
  return slots;
}

export function getNextAvailableDate(dateValue, availability = []) {
  if (!dateValue) {
    return "";
  }
  if (!availability.length) {
    return dateValue;
  }

  const baseDate = new Date(`${dateValue}T12:00:00`);
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(baseDate);
    candidate.setDate(baseDate.getDate() + offset);
    const candidateValue = toDateInputValue(candidate);
    if (hasAvailableSlots(candidateValue, availability)) {
      return candidateValue;
    }
  }

  return dateValue;
}

export function isSlotAllowed(slotValue, availability = []) {
  if (!availability.length) {
    return true;
  }
  const slot = new Date(slotValue);
  const weekday = weekdays[slot.getDay()];
  const minutes = slot.getHours() * 60 + slot.getMinutes();

  return availability.some((rawRule) => matchesAvailabilityRule(rawRule, weekday, minutes));
}

function matchesAvailabilityRule(rawRule, weekday, minutes) {
  const rule = rawRule.trim().toLowerCase();
  if (rule === weekday) {
    return true;
  }

  const window = rule.startsWith(`${weekday}:`)
    ? rule.split(":").slice(1).join(":")
    : rule.includes("-")
      ? rule
      : "";
  if (!window) {
    return false;
  }

  const [start, end] = window.split("-");
  return minutes >= toMinutes(start) && minutes <= toMinutes(end);
}

function hasAvailableSlots(dateValue, availability = []) {
  return buildSlots(dateValue).some((slot) => isSlotAllowed(slot, availability));
}

function toDateInputValue(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMinutes(value) {
  const [hour, minute] = value.trim().split(":").map(Number);
  return hour * 60 + minute;
}
