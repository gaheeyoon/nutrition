/**
 * nutritionLogic.js
 * Core logic for calculating and rounding nutrition values based on Korean standards.
 */

export const DAILY_VALUES = {
  calories: 2000,
  sodium: 2000,
  carbs: 324,
  sugars: 100,
  fat: 54,
  saturatedFat: 15,
  cholesterol: 300,
  protein: 55,
};

/**
 * Rounds value to specified unit.
 * @param {number} value
 * @param {number} unit
 * @returns {number}
 */
const roundToUnit = (value, unit) => {
  return Math.round(value / unit) * unit;
};

export const calculateNutrient = (type, value100g, totalWeight, options = {}) => {
  // 1. Calculate base value for total weight
  const baseValue = (value100g * totalWeight) / 100;
  let displayValue = "";
  let percentage = 0;
  let finalValueForPct = baseValue;

  switch (type) {
    case "calories":
      if (options.displayMode === "5kcal_zero" && baseValue < 5) {
        displayValue = "0";
        finalValueForPct = 0;
      } else if (options.displayMode === "5kcal_unit") {
        displayValue = roundToUnit(baseValue, 5).toString();
        finalValueForPct = roundToUnit(baseValue, 5);
      } else {
        displayValue = Math.round(baseValue).toString();
        finalValueForPct = Math.round(baseValue);
      }
      displayValue += "kcal";
      break;

    case "sodium":
      if (baseValue < 5 && options.displayMode === "zero_under_5") {
        displayValue = "0mg";
        finalValueForPct = 0;
      } else if (options.displayMode === "unit_5_10") {
        const unit = baseValue <= 120 ? 5 : 10;
        const rounded = roundToUnit(baseValue, unit);
        displayValue = rounded + "mg";
        finalValueForPct = rounded;
      } else {
        const rounded = Math.round(baseValue);
        displayValue = rounded + "mg";
        finalValueForPct = rounded;
      }
      break;

    case "carbs":
    case "sugars":
    case "protein":
      if (baseValue < 0.5 && options.displayMode === "zero_under_05") {
        displayValue = "0g";
        finalValueForPct = 0;
      } else if (baseValue < 1 && options.displayMode === "less_than_1") {
        displayValue = "1g 미만";
        finalValueForPct = 1; // Or according to user preference, usually 1 or actual
      } else if (options.displayMode === "unit_1") {
        const rounded = Math.round(baseValue);
        displayValue = rounded + "g";
        finalValueForPct = rounded;
      } else {
        const rounded = Math.round(baseValue * 10) / 10;
        displayValue = rounded + "g";
        finalValueForPct = rounded;
      }
      break;

    case "fat":
    case "saturatedFat":
      if (baseValue < 0.5 && options.displayMode === "zero_under_05") {
        displayValue = "0g";
        finalValueForPct = 0;
      } else if (options.displayMode === "unit_auto") {
        const rounded = baseValue <= 5 ? Math.round(baseValue * 10) / 10 : Math.round(baseValue);
        displayValue = rounded + "g";
        finalValueForPct = rounded;
      } else {
        const rounded = Math.round(baseValue * 10) / 10;
        displayValue = rounded + "g";
        finalValueForPct = rounded;
      }
      break;

    case "transFat":
      if (baseValue < 0.2 && options.displayMode === "zero_under_02") {
        displayValue = "0g";
        finalValueForPct = 0;
      } else if (baseValue < 0.5 && options.displayMode === "less_than_05") {
        displayValue = "0.5g 미만";
        finalValueForPct = 0.5;
      } else {
        const rounded = Math.round(baseValue * 10) / 10;
        displayValue = rounded + "g";
        finalValueForPct = rounded;
      }
      break;

    case "cholesterol":
      if (baseValue < 2 && options.displayMode === "zero_under_2") {
        displayValue = "0mg";
        finalValueForPct = 0;
      } else if (baseValue < 5 && options.displayMode === "less_than_5") {
        displayValue = "5mg 미만";
        finalValueForPct = 5;
      } else if (options.displayMode === "unit_5") {
        const rounded = roundToUnit(baseValue, 5);
        displayValue = rounded + "mg";
        finalValueForPct = rounded;
      } else {
        const rounded = Math.round(baseValue * 10) / 10;
        displayValue = rounded + "mg";
        finalValueForPct = rounded;
      }
      break;

    default:
      displayValue = baseValue.toFixed(1);
  }

  // Percentage calculation based on Daily Values
  if (DAILY_VALUES[type]) {
    percentage = Math.round((finalValueForPct / DAILY_VALUES[type]) * 100);
  }

  return {
    displayValue,
    percentage: percentage + "%",
    raw: baseValue,
  };
};
