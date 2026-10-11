import time

class HealthState:
    def __init__(self) -> None:
        self.start_time = time.time()

    @property
    def uptime(self) -> float:
        return float(time.time() - self.start_time)

health_state = HealthState()
