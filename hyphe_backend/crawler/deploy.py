#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os, sys, time
from inspect import getsourcefile
import subprocess, json, pystache
from shutil import copyfile
from contextlib import nested

verbose = False
for arg in [a for a in sys.argv[1:] if a.strip()]:
    if arg == "-v" or arg == "--verbose":
        verbose = True
    else:
        project = arg

# Copy config.json from root to scrapy deployment dir
if verbose:
    print "Copying config.json from root directory to hyphe_backend/crawler for scrapy deployment..."
try:
    if not os.path.exists("config"):
        os.makedirs("config")
    copyfile("../../config/config.json", "config/config.json")
except IOError as e:
    print "Could not open either source or destination config.json file"
    print "config.json", "crawler/config.json"
    print e
    exit()

from hyphe_backend.lib import config_hci
config = config_hci.load_config()
if not config:
    exit()

# Get corpus project's config in DB to replace default global conf
try:
    from pymongo import MongoClient
except:
    from pymongo import Connection as MongoClient
corpus_conf = MongoClient(os.environ.get('HYPHE_MONGODB_HOST', config["mongo-scrapy"]["host"]), int(os.environ.get('HYPHE_MONGODB_PORT', config["mongo-scrapy"]["mongo_port"])))[config["mongo-scrapy"]["db_name"]]["corpus"].find_one({"_id": project})
if corpus_conf:
    corpus_conf = corpus_conf["options"]
    config["phantom"].update(corpus_conf["phantom"])
    if corpus_conf["proxy"]["host"]:
        config["mongo-scrapy"]["proxy_host"] = corpus_conf["proxy"]["host"]
    if corpus_conf["proxy"]["port"]:
        config["mongo-scrapy"]["proxy_port"] = corpus_conf["proxy"]["port"]
else:
    print "WARNING: trying to deploy a crawler for a corpus project missing in DB"

# Copy LRUs + TLDs libraries from HCI lib/
if verbose:
    print "Importing urllru.py library from HCI hyphe_backend/lib to hcicrawler..."
try:
    copyfile("../lib/urllru.py", "hcicrawler/urllru.py")
except IOError as e:
    print "Could not open either source or destination urllru.py file"
    print "lib/urllru.py", "crawler/hcicrawler/urllru.py"
    print e
    exit()
if verbose:
    print "Importing tlds.py library from HCI hyphe_backend/lib to hcicrawler..."
try:
    copyfile("../lib/tlds.py", "hcicrawler/tlds.py")
except IOError as e:
    print "Could not open either source or destination tlds.py file"
    print "lib/tlds.py", "crawler/hcicrawler/tlds.py"
    print e
    exit()

# Render the settings py from template with mongo/scrapy config from config.json
if verbose:
    print "Rendering settings.py with mongo-scrapy config values from config.json..."
try:
    config['mongo-scrapy']['crawlerPath'] = os.path.dirname(os.path.realpath(__file__))
    config['mongo-scrapy']['db_name'] = config['mongo-scrapy']['db_name'].lower()
    config['mongo-scrapy']['project'] = project.lower()
    config['mongo-scrapy']['log_level'] = 'DEBUG' if config['DEBUG'] > 1 else 'INFO'
    config["mongo-scrapy"]["host"] = os.environ.get('HYPHE_MONGODB_HOST', config["mongo-scrapy"]["host"])
    for _to in ["", "idle_", "ajax_"]:
        config['mongo-scrapy']['phantom_%stimeout' % _to] = config['phantom']['%stimeout' % _to]
    with nested(open("hcicrawler/settings-template.py", "r"), open("hcicrawler/settings.py", "w")) as (template, generated):
        generated.write(pystache.render(template.read(), config['mongo-scrapy']))
except IOError as e:
    print "Could not open either crawler/hcicrawler/settings-template.py file or crawler/hcicrawler/settings.py"
    print e
    exit()

# Render the scrapy cfg from template with scrapy config from config.json
if verbose:
    print "Rendering scrapy.cfg with scrapy config values from config.json..."
try:
    with nested(open("scrapy-template.cfg", "r"), open("scrapy.cfg", "w")) as (template, generated):
        config["mongo-scrapy"]["host"] = os.environ.get('HYPHE_CRAWLER_HOST', config["mongo-scrapy"]["host"])
        generated.write(pystache.render(template.read(), config['mongo-scrapy']))
except IOError as e:
    print "Could not open either crawler/scrapy-template.cfg template file or crawler/scrapy.cfg"
    print e
    exit()

# Deploy the egg
if verbose:
    print "Sending HCI's scrapy egg to scrapyd server..."

p = subprocess.Popen(['scrapyd-deploy', '--version', time.strftime('%Y%m%d-%H%M%S', time.gmtime(time.time()))], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
output, errors = p.communicate()
try:
    output = json.loads(output)
    if output['status'] != "ok":
        print "There was a problem sending the scrapy egg."
        print output["message"].replace("\\n", "\n")
        print errors
        exit()
except ValueError:
    print "There was a problem sending the scrapy egg."
    print output
    print errors
    exit()
if verbose:
    print "The egg was successfully sent to scrapyd server", config['mongo-scrapy']['host'], "on port", config['mongo-scrapy']['scrapy_port']
