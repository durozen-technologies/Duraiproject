from enum import Enum

class PartyType(str, Enum):
    SUPPLIER = "SUPPLIER"
    PURCHASER = "PURCHASER"
    BOTH = "BOTH"

class TransactionType(str, Enum):
    RECEIVED = "received"
    PAID = "paid"
