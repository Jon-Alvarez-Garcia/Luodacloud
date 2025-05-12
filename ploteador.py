# ploteador.py
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import matplotlib.dates as mdates
from datetime import datetime, timedelta

class Ploteador:
    def __init__(self, col, window_seconds=100):
        self.col = col
        self.window = timedelta(seconds=window_seconds)

        self.fig, (self.ax_cpu, self.ax_mem) = plt.subplots(2,1,sharex=True)
        self.ax_cpu.xaxis.set_major_formatter(mdates.DateFormatter('%M:%S'))
        self.ax_mem.xaxis.set_major_formatter(mdates.DateFormatter('%M:%S'))

        # Límites Y fijos para CPU
        self.ax_cpu.set_ylim(0, 1600)

        # Límites Y para Memoria, cámbialos al rango que esperes
        self.ax_mem.set_ylim(0, 8000)

        self.lines_cpu = {}
        self.lines_mem = {}
        for name in self.col.cpuHist:
            lcpu, = self.ax_cpu.plot([], [], label=name)
            lmem, = self.ax_mem.plot([], [], label=name)
            self.lines_cpu[name] = lcpu
            self.lines_mem[name] = lmem

        self.ax_cpu.set_ylabel("% CPU")
        self.ax_cpu.legend()
        self.ax_mem.set_ylabel("Mem (MB)")
        self.ax_mem.legend()
        self.ax_mem.set_xlabel("Hora")

        plt.tight_layout()

    def init(self):
        # Definimos un rango X inicial de “ahora–window” a “ahora”
        now = datetime.now()
        self.ax_cpu.set_xlim(now - self.window, now)
        self.ax_mem.set_xlim(now - self.window, now)
        return list(self.lines_cpu.values()) + list(self.lines_mem.values())

    def update(self, frame):
        # 1) recogemos nuevos datos
        self.col.cogerstats()

        # 2) pintamos las líneas
        times = list(self.col.timeHist)
        for name in self.lines_cpu:
            self.lines_cpu[name].set_data(times, list(self.col.cpuHist[name]))
            self.lines_mem[name].set_data(times, list(self.col.memHist[name]))

        # 3) ajustamos siempre el eje X al rango de la ventana
        if times:
            start = times[-1] - self.window
            end   = times[-1]
            self.ax_cpu.set_xlim(start, end)
            self.ax_mem.set_xlim(start, end)

        return list(self.lines_cpu.values()) + list(self.lines_mem.values())

    def start(self, interval=2000):
        self.ani = FuncAnimation(
            self.fig, self.update, init_func=self.init,
            frames=None, interval=interval, blit=False,
            cache_frame_data=False
        )
        plt.show()
