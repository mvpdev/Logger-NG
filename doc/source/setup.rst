******
Setup
******

#. Copy / paste the entire logger_ng folder in a directory on you Python Path

#. Add 'logger_ng' in INSTALLED_APPS.

# Add a tab in RAPIDSMS_TABS, something like ("logger_ng.views.index", "New Message Log"),

#. ./manage.py syncdb

#. If you already used 'messagelog' on this project, you can run 
   ``./rapidsms import_from_logger`` import the old logs then you can remove the 
   olg app

.. note:: ``./rapidsms import_from_logger`` doesn't delete the old logs.
