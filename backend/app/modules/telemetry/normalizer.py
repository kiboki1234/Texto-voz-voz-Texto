from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class VariableDefinition:
    standard_name: str
    display_name: str
    category: str
    default_unit: str
    tag_codes: tuple[str, ...]
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class NormalizedVariable:
    standard_name: str
    display_name: str
    category: str
    unit: str
    warning: str | None = None


VARIABLES: tuple[VariableDefinition, ...] = (
    VariableDefinition("Temp_AVG", "Temperatura promedio", "temperature", "C", ("AVGTA",), ("AVGTEMP", "TEMPAVG", "TEMPERATURAPROMEDIO")),
    VariableDefinition("Temp_Min", "Temperatura minima", "temperature", "C", ("MINTA",), ("MINTEMP", "TEMPMIN", "TEMPERATURAMINIMA")),
    VariableDefinition("Temp_Max", "Temperatura maxima", "temperature", "C", ("MAXTA",), ("MAXTEMP", "TEMPMAX", "TEMPERATURAMAXIMA")),
    VariableDefinition("Humedad_AVG", "Humedad relativa promedio", "humidity", "%", ("AVGRH",), ("AVGHUM", "HUMEDADAVG", "HUMEDADPROMEDIO")),
    VariableDefinition("Humedad_Min", "Humedad relativa minima", "humidity", "%", ("MINRH",), ("MINHUM", "HUMEDADMIN")),
    VariableDefinition("Humedad_Max", "Humedad relativa maxima", "humidity", "%", ("MAXRH",), ("MAXHUM", "HUMEDADMAX")),
    VariableDefinition("Lluvia", "Precipitacion", "rainfall", "mm", ("PR",), ("PRECIPITACION", "LLUVIA")),
    VariableDefinition("RadSol_AVG", "Radiacion solar promedio", "solar_radiation", "W/m2", ("AVGSR",), ("AVGRADSOL", "RADSOLAVG", "RADAVG")),
    VariableDefinition("RadSol_Min", "Radiacion solar minima", "solar_radiation", "W/m2", ("MINSR",), ("MINRADSOL", "RADSOLMIN")),
    VariableDefinition("RadSol_Max", "Radiacion solar maxima", "solar_radiation", "W/m2", ("MAXSR",), ("MAXRADSOL", "RADSOLMAX")),
    VariableDefinition("VV_Sonic_AVG", "Velocidad viento sonico promedio", "wind_speed", "m/s", ("AVGWSS",), ("AVGVELSONIC", "AVGWINDSONIC", "AVGWS")),
    VariableDefinition("VV_Sonic_Min", "Velocidad viento sonico minima", "wind_speed", "m/s", ("MINWSS",), ("MINVELSONIC", "MINWS")),
    VariableDefinition("VV_Sonic_Max", "Velocidad viento sonico maxima", "wind_speed", "m/s", ("MAXWSS",), ("MAXVELSONIC", "MAXWS")),
    VariableDefinition("DV_Sonic_AVG", "Direccion viento sonico promedio", "wind_direction", "deg", ("AVGWDS",), ("AVGDIRSONIC", "AVGWD")),
    VariableDefinition("DV_Sonic_Min", "Direccion viento sonico minima", "wind_direction", "deg", ("MINWDS",), ("MINDIRSONIC", "MINWD")),
    VariableDefinition("DV_Sonic_Max", "Direccion viento sonico maxima", "wind_direction", "deg", ("MAXWDS",), ("MAXDIRSONIC", "MAXWD")),
    VariableDefinition("VV_Mec_AVG", "Velocidad viento mecanico promedio", "wind_speed", "m/s", ("AVGWSM",), ("AVGVELMEC",)),
    VariableDefinition("VV_Mec_Min", "Velocidad viento mecanico minima", "wind_speed", "m/s", ("MINWSM",), ("MINVELMEC",)),
    VariableDefinition("VV_Mec_Max", "Velocidad viento mecanico maxima", "wind_speed", "m/s", ("MAXWSM",), ("MAXVELMEC",)),
    VariableDefinition("DV_Mec_AVG", "Direccion viento mecanico promedio", "wind_direction", "deg", ("AVGWDM",), ("AVGDIRMEC",)),
    VariableDefinition("DV_Mec_Min", "Direccion viento mecanico minima", "wind_direction", "deg", ("MINWDM",), ("MINDIRMEC",)),
    VariableDefinition("DV_Mec_Max", "Direccion viento mecanico maxima", "wind_direction", "deg", ("MAXWDM",), ("MAXDIRMEC",)),
    VariableDefinition("Bateria", "Bateria", "battery", "V", ("DC",), ("VOLTAJE", "BATTERY", "BATERIA")),
    VariableDefinition("Hum_Hoja_AVG", "Humedad de hoja promedio", "leaf_humidity", "%", ("AVGHH",), ("AVGHUMHOJA", "HUMHOJAAVG")),
    VariableDefinition("Hum_Hoja_Min", "Humedad de hoja minima", "leaf_humidity", "%", ("MINHH",), ("MINHUMHOJA",)),
    VariableDefinition("Hum_Hoja_Max", "Humedad de hoja maxima", "leaf_humidity", "%", ("MAXHH",), ("MAXHUMHOJA",)),
    VariableDefinition("Hum_Hoja", "Humedad de hoja", "leaf_humidity", "%", ("HH",), ("HUMHOJA",)),
    VariableDefinition("N", "Nitrogeno", "soil_nutrients", "mg/Kg", ("N",), ("NITROGENO",)),
    VariableDefinition("P", "Fosforo", "soil_nutrients", "mg/Kg", ("P",), ("FOSFORO",)),
    VariableDefinition("K", "Potasio", "soil_nutrients", "mg/Kg", ("K",), ("POTASIO",)),
)


class VariableNormalizer:
    def __init__(self) -> None:
        self._by_standard = {definition.standard_name: definition for definition in VARIABLES}

    def normalize(
        self,
        code: object,
        name: object,
        parameter_id: object = None,
        unit: object = None,
        station_id: int | None = None,
    ) -> NormalizedVariable:
        raw_code = str(code or "").strip().upper()
        raw_name = _clean(str(name or ""))
        for definition in VARIABLES:
            if raw_code in definition.tag_codes or raw_name in {_clean(alias) for alias in definition.aliases}:
                warning = self._warning(definition, parameter_id, station_id)
                return NormalizedVariable(
                    standard_name=definition.standard_name,
                    display_name=definition.display_name,
                    category=definition.category,
                    unit=str(unit or definition.default_unit),
                    warning=warning,
                )
        fallback = str(name or code or "Variable desconocida")
        return NormalizedVariable(
            standard_name=fallback,
            display_name=fallback,
            category="other",
            unit=str(unit or ""),
        )

    def get_definition(self, standard_name: str) -> VariableDefinition | None:
        return self._by_standard.get(standard_name)

    def variable_options(self) -> list[dict[str, str]]:
        return [
            {
                "standard_name": definition.standard_name,
                "display_name": definition.display_name,
                "category": definition.category,
                "unit": definition.default_unit,
            }
            for definition in VARIABLES
        ]

    def _warning(
        self,
        definition: VariableDefinition,
        parameter_id: object,
        station_id: int | None,
    ) -> str | None:
        if station_id == 101 and definition.standard_name in {"N", "P", "K"} and str(parameter_id) == "1":
            return "HUACA reporta N/P/K con PARID=1; validar unidad antes de comparaciones agronomicas."
        if station_id == 101 and definition.standard_name.startswith("Hum_Hoja") and definition.standard_name != "Hum_Hoja":
            return "HUACA puede reportar solo HumHoja sin minimo/maximo."
        return None


def _clean(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())
