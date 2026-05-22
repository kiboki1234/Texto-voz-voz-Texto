from __future__ import annotations

import csv
from datetime import datetime
from io import StringIO

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse


router = APIRouter(tags=["exports"])


def _repository(request: Request):
    return request.app.state.repository


@router.get("/export/series.csv")
def export_series(
    request: Request,
    station_id: int,
    variable: str,
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    resolution: str = "raw",
) -> StreamingResponse:
    data = _repository(request).get_series(station_id, variable, from_date, to_date, resolution)
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["time", "value"])
    writer.writeheader()
    writer.writerows(data["points"])
    buffer.seek(0)
    filename = f"agrometria_{station_id}_{variable}_{resolution}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
