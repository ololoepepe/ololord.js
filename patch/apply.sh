#!/bin/bash
patch ../node_modules/ddos/index.js ./ddos.diff
patch ../node_modules/formidable/lib/incoming_form.js ./formidable.diff
