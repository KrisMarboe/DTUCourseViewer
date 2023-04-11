from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin, AdminIndexView
from flask_admin.contrib.sqla import ModelView
from flask_login import UserMixin, LoginManager, current_user, login_user, logout_user


"""
To build the database
python

>>> from app import app, db
>>> app.app_context().push()
>>> db.create_all()
"""

app = Flask(__name__)
# Create dummy secrey key so we can use sessions
app.config['SECRET_KEY'] = '123456790'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
# set optional bootswatch theme
app.config['FLASK_ADMIN_SWATCH'] = 'cerulean'
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)


with app.app_context():
    db = SQLAlchemy(app)


class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(10), nullable=False)

    def __repr__(self):
        return f'<Department {self.name}>'


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(40), nullable=False)
    password = db.Column(db.String(40), nullable=False)

    def is_authenticated(self):
        return True

    def is_active(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)


class MyModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for("login"))

class MyAdminIndexView(AdminIndexView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for("login"))


admin = Admin(app, index_view=MyAdminIndexView(), name='DTU Course Viewer', template_mode='bootstrap3')
admin.add_view(MyModelView(Department, db.session))

"""
For the pythonanywhere website
SQLALCHEMY_DATABASE_URI = "mysql+mysqlconnector://{username}:{password}@{hostname}/{databasename}".format(
    username="krism",
    password="",
    hostname="krism.mysql.pythonanywhere-services.com",
    databasename="krism$department",
)
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_POOL_RECYCLE"] = 299
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class Department(db.Model):

    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(10), nullable=False)

    def __repr__(self):
        return f'<Department {self.name}>'

"""

controls = {
    "Escape": "Reset graph",
    "Backspace": "Undo course selection",
    "Scroll": "Zoom in/out",
    "Double click": "Create focused network for selected course",
    "Click + Drag": "Move the network",
    "Ctrl + Click": "Open course page in new tab"
}


@app.route("/", methods=['POST', 'GET'])
def index():
    if request.method == 'POST':
        return redirect("/")
    else:
        return redirect("/00")


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
            active_department=department,
            controls=controls
        )


@app.route("/login", methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(user_name=username, password=password).first()
        if user is None:
            return redirect(url_for("login"))

        login_user(user)
        return redirect(url_for("admin.index"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('login'))


if __name__ == '__main__':
    app.run(debug=True)
