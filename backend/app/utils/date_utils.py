from datetime import date, datetime

DATE_FORMATS = ["%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y"]


def parse_date(value: str | None) -> date | None:
    if not value or not str(value).strip():
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None
