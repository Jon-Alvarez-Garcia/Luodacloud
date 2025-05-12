# main.py
from dockerStatsCollector import DockerStats
from ploteador import Ploteador

if __name__ == "__main__":
    stats = DockerStats(window=50)
    plot = Ploteador(stats)
    plot.start(interval=1000)
