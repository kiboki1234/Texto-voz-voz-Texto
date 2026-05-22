from app.modules.alerts.rules import classify_nutrient, dew_point_magnus, frost_classification, spray_window


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
