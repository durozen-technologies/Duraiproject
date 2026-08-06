from enum import Enum

class PartyType(str, Enum):
    SALE = "SALE"
    PURCHASER = "PURCHASER"
    BOTH = "BOTH"

class TransactionType(str, Enum):
    RECEIVED = "received"
    PAID = "paid"
