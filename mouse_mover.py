import pyautogui
import random
import time
import tkinter as tk
from pynput import keyboard

pyautogui.FAILSAFE = False
exclusion_area = None
paused = False

def select_exclusion_area():
    global exclusion_area
    
    root = tk.Tk()
    root.attributes('-fullscreen', True)
    root.attributes('-topmost', True)
    root.attributes('-alpha', 0.3)
    root.configure(bg='black', cursor='crosshair')
    
    canvas = tk.Canvas(root, bg='black', highlightthickness=0)
    canvas.pack(fill='both', expand=True)
    
    rect = None
    start_x = start_y = 0
    
    def on_press(event):
        nonlocal start_x, start_y, rect
        start_x, start_y = event.x, event.y
        rect = canvas.create_rectangle(start_x, start_y, start_x, start_y, outline='red', width=3, fill='red', stipple='gray50')
    
    def on_drag(event):
        canvas.coords(rect, start_x, start_y, event.x, event.y)
    
    def on_release(event):
        global exclusion_area
        x1, y1 = min(start_x, event.x), min(start_y, event.y)
        x2, y2 = max(start_x, event.x), max(start_y, event.y)
        exclusion_area = (x1, y1, x2, y2)
        print(f"Exclusion area: {exclusion_area}")
        root.destroy()
    
    canvas.bind('<Button-1>', on_press)
    canvas.bind('<B1-Motion>', on_drag)
    canvas.bind('<ButtonRelease-1>', on_release)
    canvas.bind('<Escape>', lambda e: root.destroy())
    
    print("Drag to select exclusion area (ESC to cancel)...")
    root.mainloop()

def is_in_exclusion_area(x, y):
    """Check if coordinates are in exclusion area"""
    if not exclusion_area:
        return False
    x1, y1, x2, y2 = exclusion_area
    return x1 <= x <= x2 and y1 <= y <= y2

def random_mouse_move():
    """Move mouse to random position avoiding exclusion area"""
    screen_width, screen_height = pyautogui.size()
    
    while True:
        x = random.randint(0, screen_width - 1)
        y = random.randint(0, screen_height - 1)
        
        if not is_in_exclusion_area(x, y):
            pyautogui.moveTo(x, y, duration=random.uniform(0.5, 1.5))
            return

def on_press(key):
    global paused
    if key == keyboard.Key.f3:
        paused = not paused
        print(f"{'PAUSED' if paused else 'RESUMED'}")

if __name__ == "__main__":
    print("Mouse Mover - Random mouse movement with exclusion area")
    print("=" * 50)
    
    choice = input("Select exclusion area? (y/n): ").lower()
    if choice == 'y':
        select_exclusion_area()
    
    print("\nStarting random mouse movement...")
    print("Press F3 to pause/resume | Press Ctrl+C to stop")
    
    listener = keyboard.Listener(on_press=on_press)
    listener.start()
    
    try:
        while True:
            if not paused:
                random_mouse_move()
            time.sleep(random.uniform(1, 3))
    except KeyboardInterrupt:
        print("\nStopped.")
        listener.stop()
