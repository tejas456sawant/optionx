from app.config import get_settings
from app.tradestation import TradeStationClient


tradestation_client = TradeStationClient(get_settings())
