# DTUCourseViewer

The web application is hosted at [krism.pythonanywhere.com](http://krism.pythonanywhere.com/)

To run the app locally simply pip install requirements and run "python app.py" in the root of the repository.

## todo list
### Less important
- Make this README-file better
- Make the colors of each department unique
- The whole page could use a facelift as we are no longer in 1990..

### Important
- Fix the "search" input in dat.gui. This includes:
  - Add functionality to search for other than course number
  - Add functionality to show possible courses which match the inputted characters for easier search
  - Fix that "backspace" and "escape" still revert the graphs to previous states when inside text-field
- Add admin-page (would be super useful for changing stuff such as colors of the departments)
  - This is actually native to django-apps, so maybe try to build repository as a django project instead (might be tedious)
- Add instructions section to the top bar