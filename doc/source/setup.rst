******
Setup
******

#. Copy / paste the entire logger_ng folder to the ./apps directory of your project.

#. Add 'logger_ng' **at the begining** of the app list in your *.ini file.

#. If you already used 'logger' on this project, remove the 'logger' app 
   (as they are not compatible)
   from your *.ini file and run ``./rapidsms import_from_logger`` to update to
   import the old logs 

.. note:: ``./rapidsms import_from_logger`` doesn't delete the old logs.
