#!/usr/bin/env python
# vim: ai ts=4 sts=4 et sw=4
# maintainer: dgelvin

"""
Decorate the IncommingMessage.respond method so it watermarks the response
message.
"""

from functools import update_wrapper
from rapidsms.messages.incoming import IncomingMessage

# need to rename the old method to avoid recursive calls    
IncomingMessage._respond = IncomingMessage.respond

def respond(self, *args, **kwargs):
    """
        Add a reference to the message the current sms is a response to
    """
    msg = self._respond(*args, **kwargs)
    msg.logger_id = self.logger_id
    return msg 

# update_wapper update metadata so the wrapper looks like the wrapped
# hence it won't kill introspection
IncomingMessage.respond = update_wrapper(respond, 
                                         IncomingMessage._respond)
