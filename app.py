from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

"""
To build the database
python

>>> from app import app, db
>>> app.app_context().push()
>>> db.create_all()
"""

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'

with app.app_context():
    db = SQLAlchemy(app)


class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(10), nullable=False)

    def __repr__(self):
        return f'<Department {self.name}>'


@app.route("/", methods=['POST', 'GET'])
def index():
    if request.method == 'POST':
        return redirect("/")
    else:
        departments = Department.query.order_by(Department.id).all()
        network_path = url_for("static", filename="networks/all/network.json")
        data_path = url_for("static", filename="networks/all/data.json")
        config_path = url_for("static", filename="networks/all/config.json")
        return render_template(
            'index.html',
            network_path=network_path,
            data_path=data_path,
            config_path=config_path,
            departments=departments,
            active_department="All"
        )


@app.route("/<department>", methods=['POST', 'GET'])
def departments(department):
    if request.method == 'POST':
        return redirect("/")
    else:
        departments = Department.query.order_by(Department.id).all()
        network_path = url_for("static", filename=f"networks/{department}/network.json")
        data_path = url_for("static", filename=f"networks/{department}/data.json")
        config_path = url_for("static", filename=f"networks/{department}/config.json")
        return render_template(
            'index.html',
            network_path=network_path,
            data_path=data_path,
            config_path=config_path,
            departments=departments,
            active_department=department
        )


if __name__ == '__main__':
    app.run(debug=True)