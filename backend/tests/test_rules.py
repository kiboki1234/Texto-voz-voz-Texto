from app.modules.alerts.rules import AlertEngine, battery_threshold, classify_nutrient, dew_point_magnus, frost_classification, spray_window


def test_frost_white_watch() -> None:
    result = frost_classification(1.5, 80)
    assert result["risk"] == "watch"
    assert result["type"] == "blanca"


def test_frost_black_critical() -> None:
    result = frost_classification(-0.2, 45)
    assert result["risk"] == "critical"
    assert result["type"] == "negra"


def test_spray_window_returns_reasons() -> None:
    result = spray_window({"wind_speed_avg": 4.5, "rainfall": 2, "temperature_avg": 18, "leaf_humidity_avg": 82})
    assert result["is_suitable"] is False
    assert len(result["reasons"]) >= 2


def test_npk_classification() -> None:
    assert classify_nutrient("N", 12)["status"] == "deficient"
    assert classify_nutrient("P", 18)["status"] == "optimal"
    assert classify_nutrient("K", 240)["status"] == "excess"


def test_dew_point_is_numeric() -> None:
    assert isinstance(dew_point_magnus(12, 80), float)


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
