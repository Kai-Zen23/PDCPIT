import random

# --- POWER-UP POOL ---

POWERUP_POOL = [
    "card_destroyer",
    "rightmost_removal",
    "self_cleanse",
    "double_purge",
    "target_shift_19",
    "target_shift_21",
    "target_shift_28",
    "shield",
    "random_swap",
    "sudden_risk",
    "lucky_replace"
]

# --- POWER-UP FUNCTIONS ---

def card_destroyer(attacker, defender, card_index=0):
    """Remove one card from defender's hand (attacker chooses which)."""
    if not defender["hand"]:
        print(f"FAILED: {defender['name']} has no cards to destroy.")
        return False
    
    # Ensure card_index is valid
    idx = max(0, min(card_index, len(defender["hand"]) - 1))
    removed_card = defender["hand"].pop(idx)
    print(f"POWER-UP: {attacker['name']} used Card Destroyer! Removed {removed_card} from {defender['name']}'s hand.")
    return True

def rightmost_removal(attacker, defender):
    """Remove the last card in defender's hand."""
    if not defender["hand"]:
        print(f"FAILED: {defender['name']} has no cards to remove.")
        return False
    
    removed_card = defender["hand"].pop()
    print(f"POWER-UP: {attacker['name']} used Rightmost Removal! Removed {removed_card} from {defender['name']}'s hand.")
    return True

def self_cleanse(player):
    """Remove the player's own most recently drawn card."""
    if not player["hand"]:
        print(f"FAILED: {player['name']} has no cards to cleanse.")
        return False
    
    removed_card = player["hand"].pop()
    print(f"POWER-UP: {player['name']} used Self Cleanse! Removed their own {removed_card}.")
    return True

def double_purge(player):
    """Remove the player's own last 2 cards."""
    if len(player["hand"]) < 2:
        print(f"FAILED: {player['name']} has fewer than 2 cards to purge.")
        return False
    
    removed1 = player["hand"].pop()
    removed2 = player["hand"].pop()
    print(f"POWER-UP: {player['name']} used Double Purge! Removed their own last 2 cards: {removed1} and {removed2}.")
    return True

def target_shift_19(game_state):
    """Set game_state['target'] = 19"""
    game_state["target"] = 19
    print("POWER-UP: Target shifted to 19!")
    return True

def target_shift_21(game_state):
    """Set game_state['target'] = 21"""
    game_state["target"] = 21
    print("POWER-UP: Target shifted to 21!")
    return True

def target_shift_28(game_state):
    """Set game_state['target'] = 28"""
    game_state["target"] = 28
    print("POWER-UP: Target shifted to 28!")
    return True

def shield(player):
    """Set player['shielded'] = True"""
    player["shielded"] = True
    print(f"POWER-UP: {player['name']} activated a Shield!")
    return True

def random_swap(player_a, player_b):
    """Pick one random card from each player's hand and swap them."""
    if not player_a["hand"] or not player_b["hand"]:
        print(f"FAILED: Both players must have cards for Random Swap.")
        return False
    
    idx_a = random.randint(0, len(player_a["hand"]) - 1)
    idx_b = random.randint(0, len(player_b["hand"]) - 1)
    
    card_a = player_a["hand"][idx_a]
    card_b = player_b["hand"][idx_b]
    
    player_a["hand"][idx_a] = card_b
    player_b["hand"][idx_b] = card_a
    
    print(f"POWER-UP: Random Swap! {player_a['name']} swapped {card_a} for {player_b['name']}'s {card_b}.")
    return True

def sudden_risk(player, target_value):
    """Double the value of the player's most recently drawn card."""
    if not player["hand"]:
        print(f"FAILED: {player['name']} has no cards to double.")
        return False
    
    old_value = player["hand"][-1]
    new_value = old_value * 2
    player["hand"][-1] = new_value
    
    print(f"POWER-UP: Sudden Risk! {player['name']}'s {old_value} doubled to {new_value}.")
    if sum(player["hand"]) > target_value:
        print(f"WARNING: {player['name']} BUSTED after Sudden Risk!")
    return True

def lucky_replace(player, deck):
    """Player chooses one card to discard and draws a replacement."""
    if not player["hand"]:
        print(f"FAILED: {player['name']} has no cards to replace.")
        return False
    if not deck:
        print(f"FAILED: The deck is empty.")
        return False
    
    # For demo, we discard the first card
    discarded = player["hand"].pop(0)
    new_card = deck.pop()
    player["hand"].append(new_card)
    
    print(f"POWER-UP: Lucky Replace! {player['name']} discarded {discarded} and drew {new_card}.")
    return True

# --- CORE LOGIC ---

def assign_powerups(powerup_pool):
    """Returns a list of 4 unique random power-ups."""
    return random.sample(powerup_pool, 4)

def try_apply(power_up_fn, attacker, defender, *args):
    """
    If defender is shielded, cancel the power-up and remove shield.
    Otherwise, apply it normally.
    """
    # Defensive/Self-targeted power-ups skip shield check
    # In this implementation, we check if defender is different from attacker
    # and if the function name is in the 'offensive' list.
    offensive_powerups = ["card_destroyer", "rightmost_removal", "random_swap"]
    
    if power_up_fn.__name__ in offensive_powerups and defender.get("shielded"):
        defender["shielded"] = False
        print(f"BLOCK: {defender['name']}'s Shield blocked {attacker['name']}'s {power_up_fn.__name__}!")
        return
    
    power_up_fn(attacker, defender, *args)

def advance_round(game_state, powerup_pool):
    """
    - Increment round counter
    - Assign power-ups based on round
    """
    game_state["round"] += 1
    current_round = game_state["round"]
    print(f"\n--- ADVANCING TO ROUND {current_round} ---")
    
    if current_round == 1:
        print("Round 1: No power-ups assigned.")
    elif current_round == 2:
        print("Round 2: Assigning 2 random power-ups to each player.")
        for p_id in game_state["players"]:
            player = game_state["players"][p_id]
            # Draw 2 from pool, ensuring no duplicates with what they might already have (though should be empty)
            new_picks = random.sample([p for p in powerup_pool if p not in player["powerups"]], 2)
            player["powerups"].extend(new_picks)
            print(f"  {player['name']} received: {new_picks}")
    elif current_round == 3:
        print("Round 3: Assigning 2 additional random power-ups to each player.")
        for p_id in game_state["players"]:
            player = game_state["players"][p_id]
            # Draw 2 more, ensuring no duplicates with their current 2
            available = [p for p in powerup_pool if p not in player["powerups"]]
            new_picks = random.sample(available, 2)
            player["powerups"].extend(new_picks)
            print(f"  {player['name']} received: {new_picks}")
    else:
        print(f"Round {current_round}: No more power-ups assigned.")

# --- DEMO SIMULATION ---

def main():
    # Initialize Game State
    # Cards are 1-11, each value appearing exactly ONCE per round.
    # No duplicate values are possible: each card is consumed from the deck
    # when drawn and never returned, so both players always hold distinct values.
    deck = list(range(1, 12))  # [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    random.shuffle(deck)
    
    game_state = {
        "target": 21,
        "round": 0,
        "deck": deck,
        "players": {
            "player1": {
                "name": "Player 1",
                "hand": [],
                "powerups": [],
                "used_powerups": [],
                "shielded": False,
            },
            "player2": {
                "name": "Player 2",
                "hand": [],
                "powerups": [],
                "used_powerups": [],
                "shielded": False,
            }
        }
    }

    print("=== CARD CLASH 21: POWER-UP SYSTEM DEMO ===")
    
    # --- ROUND 1 ---
    advance_round(game_state, POWERUP_POOL)
    # Simulate drawing cards
    for p in game_state["players"].values():
        p["hand"].extend([game_state["deck"].pop() for _ in range(2)])
        print(f"{p['name']} draws: {p['hand']} (Total: {sum(p['hand'])})")

    # --- ROUND 2 ---
    advance_round(game_state, POWERUP_POOL)
    
    p1 = game_state["players"]["player1"]
    p2 = game_state["players"]["player2"]

    # Player 1 uses their first power-up
    pu1 = p1["powerups"][0]
    print(f"\n{p1['name']} decides to use {pu1}...")
    
    # Define how to call each power-up based on name
    def use_powerup(name, attacker, defender, game_state):
        if name == "card_destroyer":
            try_apply(card_destroyer, attacker, defender)
        elif name == "rightmost_removal":
            try_apply(rightmost_removal, attacker, defender)
        elif name == "self_cleanse":
            self_cleanse(attacker)
        elif name == "double_purge":
            double_purge(attacker)
        elif name == "target_shift_19":
            target_shift_19(game_state)
        elif name == "target_shift_21":
            target_shift_21(game_state)
        elif name == "target_shift_28":
            target_shift_28(game_state)
        elif name == "shield":
            shield(attacker)
        elif name == "random_swap":
            try_apply(random_swap, attacker, defender)
        elif name == "sudden_risk":
            sudden_risk(attacker, game_state["target"])
        elif name == "lucky_replace":
            lucky_replace(attacker, game_state["deck"])
        
        attacker["used_powerups"].append(name)

    use_powerup(pu1, p1, p2, game_state)

    # --- ROUND 3 ---
    advance_round(game_state, POWERUP_POOL)
    
    # Player 2 uses a Shield
    print(f"\n{p2['name']} uses a Shield to protect themselves.")
    shield(p2)
    
    # Player 1 tries to use an offensive power-up (if they have one)
    offensive = [pu for pu in p1["powerups"] if pu in ["card_destroyer", "rightmost_removal", "random_swap"] and pu not in p1["used_powerups"]]
    if offensive:
        pu_off = offensive[0]
        print(f"\n{p1['name']} tries to use offensive power-up: {pu_off}")
        use_powerup(pu_off, p1, p2, game_state)
    else:
        # If no offensive, just use any
        pu_any = [pu for pu in p1["powerups"] if pu not in p1["used_powerups"]][0]
        print(f"\n{p1['name']} uses {pu_any}")
        use_powerup(pu_any, p1, p2, game_state)

    print("\n=== FINAL GAME STATE ===")
    print(f"Target: {game_state['target']}")
    for p in game_state["players"].values():
        print(f"{p['name']}:")
        print(f"  Hand: {p['hand']} (Total: {sum(p['hand'])})")
        print(f"  Shielded: {p['shielded']}")
        print(f"  Used Power-ups: {p['used_powerups']}")

if __name__ == "__main__":
    main()
