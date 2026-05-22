from app.modules.alerts.rules import AlertEngine, battery_threshold, classify_nutrient, estimated_relative_humidity_from_temperatures, frost_classification, frost_probability_percent, spray_window


def test_estimated_relative_humidity_is_clamped() -> None:
    result = estimated_relative_humidity_from_temperatures(4, 2)
    assert result == 100.0


def test_frost_white_critical_with_estimated_humidity() -> None:
    result = frost_classification(-1.0, 0.0)
    assert result["risk"] == "critical"
    assert result["type"] == "blanca"
    assert result["estimated_humidity"] >= 70
    assert result["frost_probability"] == 100.0


def test_frost_black_critical_with_estimated_humidity() -> None:
    result = frost_classification(-2.0, 10.0)
    assert result["risk"] == "critical"
    assert result["type"] == "negra"
    assert result["estimated_humidity"] < 70


def test_frost_above_zero_near_threshold_is_watch() -> None:
    result = frost_classification(0.1, 2.0)
    assert result["risk"] == "watch"
    assert result["type"] is None
    assert result["frost_probability"] >= 50


def test_frost_probability_uses_temperature_and_humidity_factors() -> None:
    assert frost_probability_percent(0, 70) == 100.0
    assert frost_probability_percent(1, 70) == 50.0
    assert frost_probability_percent(3, 70) == 0.0


def test_frost_above_two_degrees_is_normal() -> None:
    result = frost_classification(3.0, 6.0)
    assert result["risk"] == "normal"
    assert result["frost_probability"] == 0.0


def test_spray_window_returns_reasons() -> None:
    result = spray_window({"wind_speed_avg": 4.5, "rainfall": 2, "temperature_avg": 18, "leaf_humidity_avg": 82})
    assert result["is_suitable"] is False
    assert len(result["reasons"]) >= 2


def test_npk_classification() -> None:
    assert classify_nutrient("N", 12)["status"] == "deficient"
    assert classify_nutrient("P", 18)["status"] == "optimal"
    assert classify_nutrient("K", 240)["status"] == "excess"


def test_battery_threshold_is_adaptive() -> None:
    assert battery_threshold(3.9) == 3.7
    assert battery_threshold(12.1) == 11.5


def test_alert_engine_uses_documented_thresholds() -> None:
    alerts = AlertEngine().evaluate(
        {
            "station_id": 102,
            "station_name": "CAYAMBE",
            "temperature_min": 4,
            "humidity_avg": 75,
            "temperature_avg": 18,
            "wind_speed_max": 16,
            "rainfall": 21,
            "battery_voltage": 12,
            "leaf_humidity_avg": 92,
            "solar_radiation_max": 1001,
            "nitrogen": 30,
            "phosphorus": 20,
            "potassium": 120,
        }
    )
    categories = {alert.category for alert in alerts}
    assert {"wind", "rain", "leaf_humidity", "solar_radiation"}.issubset(categories)
