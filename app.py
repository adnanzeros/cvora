from io import BytesIO
from xml.sax.saxutils import escape

from flask import Flask, jsonify, render_template, request, send_file
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, PageBreak, KeepTogether

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

DEFAULT_PAGES = {"bangladesh": 2, "europe": 1, "international": 1, "modern": 1}


def _register_unicode_font():
    """Use a locally installed Unicode font when available; never require a network font."""
    candidates = [
        ("CVoraUnicode", r"C:\Windows\Fonts\Nirmala.ttc"),
        ("CVoraUnicode", r"C:\Windows\Fonts\Nirmala.ttf"),
        ("CVoraUnicode", r"C:\Windows\Fonts\arial.ttf"),
        ("CVoraUnicode", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for name, path in candidates:
        try:
            pdfmetrics.registerFont(TTFont(name, path))
            return name
        except Exception:
            continue
    return "Helvetica"


def _cv_sections(data, template):
    def text(key):
        value = data.get(key, "")
        if isinstance(value, (dict, list)):
            return ""
        return str(value or "").strip()

    def rows(key, fields):
        values = data.get(key, [])
        if not isinstance(values, list):
            return []
        result = []
        for item in values:
            if not isinstance(item, dict):
                continue
            line = " · ".join(str(item.get(field, "")).strip() for field in fields if item.get(field))
            if line:
                result.append(line)
        return result

    sections = []
    if text("summary"):
        sections.append(("Profile" if template == "europe" else "Professional Summary", [text("summary")]))
    for title, key, fields in [
        ("Experience", "experience", ("role", "organization", "startDate", "endDate", "details")),
        ("Education", "education", ("qualification", "institution", "subject", "date", "result")),
        ("Projects", "projects", ("projectName", "period", "details")),
    ]:
        content = rows(key, fields)
        if content:
            sections.append((title, content))
    for title, key in [("Skills", "skills"), ("Languages", "languages"), ("Training & Certifications", "training"), ("Interests & Hobbies", "hobbies")]:
        value = text(key)
        if key == "languages":
            value = "\n".join(rows(key, ("language", "level")))
        if value:
            sections.append((title, [value]))
    if template == "bangladesh":
        details = [f"{label}: {text(key)}" for label, key in [("Father", "fatherName"), ("Mother", "motherName"), ("Date of birth", "dob"), ("Gender", "gender"), ("Nationality", "nationality"), ("Blood group", "bloodGroup"), ("Marital status", "maritalStatus"), ("Present address", "presentAddress"), ("Permanent address", "permanentAddress")] if text(key)]
        if details:
            sections.insert(0, ("Personal Information", details))
        if text("declaration"):
            sections.append(("Declaration", [text("declaration")]))
        if text("signature"):
            sections.append(("Applicant Signature", [text("signature")]))
    if data.get("references"):
        refs = rows("references", ("name", "title", "contact"))
        if refs:
            sections.append(("References", refs))
    return sections


def _make_cv_pdf(data):
    template = data.get("template", "bangladesh")
    if template not in DEFAULT_PAGES:
        raise ValueError("Choose a valid CV template.")
    try:
        page_count = int(data.get("pageCount", DEFAULT_PAGES[template]))
    except (TypeError, ValueError):
        raise ValueError("Choose 1 or 2 pages.")
    if page_count not in (1, 2):
        raise ValueError("Choose 1 or 2 pages.")

    font = _register_unicode_font()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("CVTitle", parent=styles["Title"], fontName=font, fontSize=20, leading=23, textColor=colors.HexColor("#172554"), alignment=TA_LEFT, spaceAfter=2)
    sub_style = ParagraphStyle("CVSub", parent=styles["Normal"], fontName=font, fontSize=9, leading=11, textColor=colors.HexColor("#475569"), spaceAfter=1)
    heading_style = ParagraphStyle("CVHeading", parent=styles["Heading2"], fontName=font, fontSize=10.5, leading=12, textColor=colors.HexColor("#1d4ed8"), spaceBefore=5, spaceAfter=2, keepWithNext=True)
    body_style = ParagraphStyle("CVBody", parent=styles["BodyText"], fontName=font, fontSize=9, leading=11, textColor=colors.HexColor("#1f2937"), spaceAfter=1, splitLongWords=1)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=11*mm, leftMargin=11*mm, topMargin=10*mm, bottomMargin=14*mm, title=f"{data.get('fullName') or 'CV'} - CVora", author="CVora")
    story = []
    name = escape(str(data.get("fullName") or "Your Name"))
    story.append(Paragraph(name, title_style))
    for key in ("title", "email", "phone", "presentAddress", "linkedin", "website"):
        value = str(data.get(key) or "").strip()
        if value:
            story.append(Paragraph(escape(value), sub_style))
    story.append(Spacer(1, 2*mm))
    sections = _cv_sections(data, template)
    if page_count == 2 and sections:
        section_weights = [sum(len(line) for line in lines) + len(title) * 2 for title, lines in sections]
        target_weight = sum(section_weights) / 2
        running_weight = 0
        split = 1
        for section_index, weight in enumerate(section_weights[:-1], start=1):
            running_weight += weight
            split = section_index
            if running_weight >= target_weight:
                break
        split = max(1, min(split, len(sections) - 1))
        halves = (sections[:split], sections[split:])
    else:
        halves = (sections,)
    for index, group in enumerate(halves):
        if index:
            story.append(PageBreak())
        if not group:
            story.append(Spacer(1, 1))
        for heading, lines in group:
            block = [Paragraph(escape(heading), heading_style)]
            for line in lines:
                block.append(Paragraph(escape(line).replace("\n", "<br/>"), body_style))
            story.append(KeepTogether(block))

    def page_chrome(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#dbe3ef"))
        canvas.line(11*mm, 12*mm, A4[0]-11*mm, 12*mm)
        canvas.setFont(font, 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawRightString(A4[0]-11*mm, 8*mm, f"{_doc.page}")
        canvas.restoreState()

    class PageLimitCanvas(canvas.Canvas):
        def showPage(self):
            if self.getPageNumber() > page_count:
                raise ValueError(f"Your content does not fit in {page_count} page(s). Shorten a few sections or choose 2 pages.")
            super().showPage()

    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome, canvasmaker=PageLimitCanvas)
    buffer.seek(0)
    return buffer


@app.route("/")
def index():
    templates = [
        {
            "id": "bangladesh",
            "name": "Bangladesh Standard CV",
            "description": "Traditional Bangladesh CV with photo header, personal details, and declaration.",
        },
        {
            "id": "europe",
            "name": "European-Style CV",
            "description": "Clean and ATS-conscious format for European applications.",
        },
        {
            "id": "international",
            "name": "International Professional CV",
            "description": "Flexible global CV for international hiring markets.",
        },
        {
            "id": "modern",
            "name": "Modern Professional CV",
            "description": "Contemporary layout suited to modern tech and creative roles.",
        },
    ]
    return render_template("index.html", templates=templates)


@app.post("/export-pdf")
def export_pdf():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="CV data is missing or invalid."), 400
    try:
        pdf = _make_cv_pdf(data)
    except ValueError as error:
        return jsonify(error=str(error)), 400
    filename = "cvora-cv.pdf"
    return send_file(pdf, mimetype="application/pdf", as_attachment=True, download_name=filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
