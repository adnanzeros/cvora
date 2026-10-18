from flask import Flask, render_template

app = Flask(__name__)


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
