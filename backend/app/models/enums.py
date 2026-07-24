from enum import Enum

class PartyType(str, Enum):
    SUPPLIER = "SUPPLIER"
    PURCHASER = "PURCHASER"

class TransactionType(str, Enum):
    RECEIVED = "received"
    PAID = "paid"
