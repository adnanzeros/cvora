import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app


def test_homepage_renders():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "CVora" in html
    assert "Bangladesh Standard CV" in html
    assert "European-Style CV" in html
    assert "International Professional CV" in html
    assert "Modern Professional CV" in html


def test_templates_are_exposed_in_markup():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "data-template=\"bangladesh\"" in html
    assert "data-template=\"europe\"" in html
    assert "data-template=\"international\"" in html
    assert "data-template=\"modern\"" in html


def test_local_assistant_and_document_controls_render():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert 'id="reviewList"' in html
    assert 'id="jobDescription"' in html
    assert 'id="qualityScore"' in html
    assert 'id="addProjectBtn"' in html
    assert 'id="signaturePad"' in html
    assert 'id="clearDataBtn"' in html
