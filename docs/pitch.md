# Pitch de 3 minutos

## 1. Problema

La UPEC cuenta con seis estaciones meteorologicas automaticas, pero la informacion queda encerrada en YDOC Insight. Investigadores, GADs y agricultores necesitan datos claros, recientes y accionables.

## 2. Hallazgo tecnico

Auditamos el clon `Insights` y encontramos una base legacy sin foreign keys reales. El modelo util es logico: `locations -> tags -> recentvalues/measurements`. `recentvalues` permite tiempo real y `measurements` permite historicos filtrados.

## 3. Solucion

AgroMetrIA convierte datos crudos YDOC en tres dashboards:

- Cientifico: series, ET0, ombrotermico, heladas, NPK y viento.
- GAD: semaforos territoriales y alertas institucionales.
- Agricultor: lectura movil con recomendaciones simples como "puedo fumigar hoy?".

## 4. IA explicable

No usamos una caja negra para decisiones criticas. Implementamos reglas agrometeorologicas explicables: helada blanca/negra, NPK, fumigacion, bateria, humedad de hoja y ET0 aproximada.

## 5. Viabilidad

La solucion no modifica SQL Server y se conecta directamente al esquema YDOC en modo solo lectura.

## Cierre

AgroMetrIA transforma datos meteorologicos cerrados en informacion publica para investigacion, gestion territorial y decisiones agricolas.
