"""
Tracks conversation history, intent, and seen results across turns.
"""


class Session:
    def __init__(self):
        self.history    = []    # LLM message history
        self.intent     = {}    # merged intent across all turns
        self.last_result = None
        self.seen_ids   = set() # IDs of items already shown to the user

    def add_exchange(self, user_text: str, assistant_text: str):
        self.history.append({"role": "user",      "content": user_text})
        self.history.append({"role": "assistant", "content": assistant_text})

    def merge_intent(self, new_intent: dict):
        """
        Merge new intent into the running intent.
        Non-null fields overwrite previous values so partial updates
        like {"fit": "loose"} don't wipe out color/category.
        """
        for key, value in new_intent.items():
            if value is not None:
                self.intent[key] = value

    def mark_seen(self, item_id: int):
        self.seen_ids.add(item_id)

    def recent_history(self, n_turns: int = 3) -> list:
        return self.history[-(n_turns * 2):]

    def reset(self):
        self.history.clear()
        self.intent.clear()
        self.seen_ids.clear()
        self.last_result = None
