# API routes for clinic statistics and saved term reports.

from datetime import date

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import Authorized, DbSession
from app.core.permissions import Permission
from app.schemas.support import ReportCreate, ReportDetail, ReportOut, ReportSummary
from app.services import reports

router = APIRouter(prefix="/reports", tags=["Reports and statistics"])

Viewer = Authorized(Permission.REPORTS_VIEW)
Generator = Authorized(Permission.REPORTS_GENERATE)


def _csv(content: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _check_period(start: date, end: date) -> None:
    if end < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end must not be before start")


@router.get("/summary", response_model=ReportSummary,
            summary="Live clinic statistics for any period (FR-14)")
def summary(start: date, end: date, db: DbSession, _: Viewer):
    _check_period(start, end)
    return reports.summarize(db, start, end)


@router.get("/summary.csv", summary="The same statistics as a CSV file")
def summary_csv(start: date, end: date, db: DbSession, _: Viewer):
    _check_period(start, end)
    return _csv(reports.to_csv(reports.summarize(db, start, end)),
                f"clinic-summary-{start}-to-{end}.csv")


@router.get("", response_model=list[ReportOut], summary="Saved semester and summer reports")
def list_reports(db: DbSession, _: Viewer):
    return reports.list_reports(db)


@router.post("", response_model=ReportDetail, status_code=status.HTTP_201_CREATED,
             summary="Generate and save a report for a term (FR-13, coordinator)")
def generate(data: ReportCreate, db: DbSession, actor: Generator):
    return reports.generate(db, data, actor)


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(report_id: int, db: DbSession, _: Viewer):
    return reports.get(db, report_id)


@router.get("/{report_id}/csv", summary="Download a saved report as CSV")
def report_csv(report_id: int, db: DbSession, _: Viewer):
    report = reports.get(db, report_id)
    return _csv(reports.to_csv(report.summary, report.title), f"clinic-report-{report_id}.csv")


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: DbSession, actor: Generator):
    reports.delete(db, report_id, actor)
