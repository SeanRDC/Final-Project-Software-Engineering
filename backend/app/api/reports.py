# API routes for clinic statistics and saved term reports.

from datetime import date

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import Authorized, DbSession
from app.core.clock import utcnow
from app.core.permissions import Permission
from app.schemas.support import ReportCreate, ReportDetail, ReportOut, ReportSummary
from app.services import report_xlsx, reports

router = APIRouter(prefix="/reports", tags=["Reports and statistics"])

Viewer = Authorized(Permission.REPORTS_VIEW)
Generator = Authorized(Permission.REPORTS_GENERATE)


def _csv(content: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _xlsx(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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


@router.get("/summary.xlsx", summary="The same statistics as a formatted Excel workbook")
def summary_xlsx(start: date, end: date, db: DbSession, viewer: Viewer):
    _check_period(start, end)
    workbook = report_xlsx.build(
        reports.summarize(db, start, end), "Clinic summary report", viewer.full_name, utcnow()
    )
    return _xlsx(workbook, f"clinic-summary-{start}-to-{end}.xlsx")


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


@router.get("/{report_id}/xlsx", summary="Download a saved report as a formatted Excel workbook")
def report_xlsx_file(report_id: int, db: DbSession, _: Viewer):
    report = reports.get(db, report_id)
    workbook = report_xlsx.build(
        report.summary, report.title, report.generated_by_name, report.created_at
    )
    return _xlsx(workbook, f"clinic-report-{report_id}.xlsx")


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: DbSession, actor: Generator):
    reports.delete(db, report_id, actor)
