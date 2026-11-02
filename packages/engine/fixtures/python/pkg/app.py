"""Fixture package for Python adapter tests."""
import os
from . import util

class Service:
    def run(self):
        return util.VALUE

def create():
    return Service()
