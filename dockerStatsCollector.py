# dockerStatsCollector.py
from datetime import datetime
import docker, json
from collections import deque

class DockerStats:

    def __init__(self, window = 50):
        # Estos son los parametros que tengo que recoger
        self.client = docker.from_env()
        self.containers = self.client.containers.list()
        self.window = window # Número máximo de datos a recoger
        # Historial de los datos recogidos
        # Se guarda solo el historial de la CPU, la memoria y el timestamp
        self.cpuHist = {ctr.name: deque(maxlen=window) for ctr in self.containers}
        self.memHist = {ctr.name: deque(maxlen=window) for ctr in self.containers}
        self.timeHist = deque(maxlen=window)

    # Con este metodo leo los stats de todos los containers y luego realizo los calculos de la información que quiero
    def cogerstats(self):

        # Recojo todos los stats de todos los containers
        fullstats = {cont.name: cont.stats(stream=False) for cont in self.containers}
        # Guardo el timestamp en timeHist
        now = datetime.now()
        print("TimeStamp: ", now)
        self.timeHist.append(now)
        for name, full in fullstats.items():
            st = self.parsestats(full)
            cpu = self.calculocpu(st)
            print("CPU de ", name,":", cpu)
            mem = st.get("memory_stats",{}).get("usage",0)/(1024**2)
            print("Memoria de", name, ":", mem)
            self.cpuHist[name].append(cpu)
            self.memHist[name].append(mem)


    # Esta función no da robustez ante problemas con el comando stats de docker
    def parsestats(self, raw):
        # parsear raw->dict si es string/bytes
        return json.loads(raw) if isinstance(raw, (bytes, str)) else raw

    # Calculo del consumo de CPU
    def calculocpu(self,stats):
        # 1.- Calculamos la delta de la CPU
        cputotal        = stats["cpu_stats"]["cpu_usage"]["total_usage"]
        precputotal     = stats["precpu_stats"]["cpu_usage"]["total_usage"]
        cpudelta        = cputotal - precputotal

        # 2.- Utilización total del sistema

        systemcpu       = stats["cpu_stats"].get("system_cpu_usage")
        presystemcpu    = stats["precpu_stats"].get("system_cpu_usage", 0)
        systemdelta     = (systemcpu - presystemcpu) if systemcpu else 0

        # 3.- Evitamos dividir por cero
        if systemdelta <= 0:
            return 0.0

        # 4.- Número de CPUs
        ncpus = stats["cpu_stats"].get("online_cpus") \
                or len(stats["cpu_stats"]["cpu_usage"].get("percpu_usage",[]))\
                or 1
        # 5.- Cálculo final
        cpucont = (cpudelta/systemdelta)*ncpus*100.0
        return cpucont