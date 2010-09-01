#!/usr/bin/env python
# vim: ai ts=4 sts=4 et sw=4
# maintainer: dgelvin

'''
A helper command to export your old logger records to the new logger_ng.

To run, simply replace logger in your local.ini apps list with logger_ng, then
run: ./manage.py import_from_logger

It will even (somewhat) intelligently associate outgoing messages with their
corresponding incoming message, based on the message identity, backend, and
timestamp.

Before importing, it will first check a random sampling of old messages
and if it finds they've already been imported, it will exit-
In other words, it won't let you accidentally import your old logs twice.
'''

import random
import sys
from datetime import timedelta

from django.utils.translation import ugettext as _
from django.core.management.base import BaseCommand, CommandError

from rapidsms.contrib.messagelog.models import Message
from logger_ng.models import LoggedMessage
from rapidsms.models import Connection


def create_from_logger_msg(msg):
    '''
    Helper function that takes either a Message
     (from the old logger app) and creates a LoggedMessage
    object from it. It saves the new LoggedMessage then returns it.
    '''

    if not msg.connection:
        print "\nThe message %s doesn't have a connection. Skipped." % msg
        return None

    msg_lng = LoggedMessage(identity=msg.connection.identity, 
                            backend=msg.connection.backend.name,
                            text=msg.text, contact=msg.contact, 
                            direction=msg.direction)
    msg_lng.save()
    msg_lng.date = msg.date
    msg_lng.save()
    return msg_lng


class Command(BaseCommand):
    '''
    This class _must_ be named command and subclass BaseCommand to work.
    '''

    def handle(self, *args, **options):
        '''
        Do the import, will be called when the management call of
            ./manage.py import_from_logger
        is called.
        '''

        # This is used to pair the outgoing message with incoming messages
        # If we find an outgoing message that was sent within
        # SECONDS_BEFORE_MATCH before the outgoing message, to the same
        # identity on the same backend, we assume that the outgoing message
        # is a response to the incoming message and we set the response_to
        # of the outgoing message to the incoming message.
        # If you don't want this behaviour, set this to 0.
        SECONDS_BEFORE_MATCH = 5

        OUTGOING = LoggedMessage.DIRECTION_OUTGOING
        INCOMING = LoggedMessage.DIRECTION_INCOMING

        if not Message.objects.count():
            raise CommandError(_(u"There are no messages in the logger app " \
                                 u"to import."))

        # First let's do a sanity check to see if we've already imported
        # We choose 5 random incoming and outgoing messages. If any of them
        # already exist in logger_ng, we exit without importing.
        checks = []
        for i in range(0, 5):
            checks.append(random.choice(Message.objects.all()))

        for msg in checks:
            if msg.connection:
                messages = LoggedMessage.objects.filter(identity=msg.connection.identity,
                                                        backend=msg.connection.backend.name,
                                                        text=msg.text,
                                                        date=msg.date)
                                                    
                if messages.filter(direction=msg.direction).count():
                    raise CommandError(_(u"It appears that you have already " \
                                         u"imported your messages."))
            else:
                print _(u"The message %s doesn't have a connection." % msg)

        print _(u"Importing %d incoming messages...") % \
              Message.objects.filter(direction=INCOMING).count()
        for msg in Message.objects.filter(direction=INCOMING):
            msg_lng = create_from_logger_msg(msg)
            if msg_lng: 
                msg_lng.save()

        print _(u"Importing %d outgoing messages...") % \
              Message.objects.filter(direction=OUTGOING).count()
              
        count = 0
        for msg in Message.objects.filter(direction=OUTGOING):
            sys.stdout.write('.')
            msg_lng = create_from_logger_msg(msg)
            
            if msg_lng:
                if SECONDS_BEFORE_MATCH > 0:
                    just_before = msg.date - timedelta(seconds=SECONDS_BEFORE_MATCH)
                    try:
                        orig = LoggedMessage.incoming.get(identity=msg.connection.identity,
                                                          backend=msg.connection.backend.name,
                                                          date__gte=just_before,
                                                          date__lte=msg.date)
                    except (LoggedMessage.DoesNotExist,
                            LoggedMessage.MultipleObjectsReturned):
                        pass
                    else:
                        count += 1
                        msg_lng.response_to = orig
                        
                msg_lng.save()
        print

        print _(u"%d outgoing messages paired with " \
                u"their incoming messages.") % count

        print _(u"Importing complete.")
