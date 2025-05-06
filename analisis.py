import matplotlib.pyplot as plt
import matplotlib.animation as animation
import subprocess
import time

# Inicializar listas para almacenar los datos
timestamps = []
container_stats = {}
max_samples = 50

# Función para obtener estadísticas de Docker
def get_docker_stats():
    # Ejecuta el comando docker stats para obtener las estadísticas de los contenedores
    result = subprocess.run(
        ['docker', 'stats', '--no-stream', '--format', '{{.Name}}: CPU={{.CPUPerc}}, Mem={{.MemUsage}}'],
        stdout=subprocess.PIPE
    )
    
    stats = result.stdout.decode('utf-8').splitlines()

    container_stats = {}
    
    # Verificar que hay datos y procesarlos
    for stat in stats:
        if stat.strip():  # Ignorar líneas vacías
            container_name, stats_info = stat.split(": ")
            cpu_usage = float(stats_info.split(",")[0].split("=")[1].replace("%", "").strip())
            mem_usage = stats_info.split(",")[1].split("=")[1].strip()
            mem_used, mem_total = mem_usage.split(" / ")
            mem_used = float(mem_used.replace('MiB', '').replace('GiB', '').strip())
            
            # Debugging: Imprimir valores para ver si se están actualizando
            print(f"Container: {container_name}, CPU: {cpu_usage}%, Mem: {mem_used} GiB")
            
            container_stats[container_name] = {'cpu': cpu_usage, 'mem': mem_used}
    
    return container_stats

# Función para actualizar los datos y las gráficas
def update_data(i):
    global container_stats, timestamps

    # Obtener datos de Docker
    container_stats = get_docker_stats()

    # Guardar la marca de tiempo
    timestamps.append(time.strftime('%H:%M:%S'))
    if len(timestamps) > max_samples:
        timestamps.pop(0)

    # Verificar si se encontraron datos
    if not container_stats:
        print("No se encontraron datos de contenedores.")
        return

    # Actualizar las gráficas de CPU y Memoria
    for ax in axs:
        ax.clear()

    # Graficar cada contenedor
    for i, (container, stats) in enumerate(container_stats.items()):
        axs[i].plot(timestamps, [stats['cpu']] * len(timestamps), label=f'{container} CPU (%)', color='blue')
        axs[i].set_title(f'Uso de CPU - {container}')
        axs[i].set_xlabel('Tiempo')
        axs[i].set_ylabel('Uso (%)')
        axs[i].legend(loc='upper left')

        axs[i + len(container_stats)].plot(timestamps, [stats['mem']] * len(timestamps), label=f'{container} Memoria (GiB)', color='green')
        axs[i + len(container_stats)].set_title(f'Uso de Memoria - {container}')
        axs[i + len(container_stats)].set_xlabel('Tiempo')
        axs[i + len(container_stats)].set_ylabel('Uso (GiB)')
        axs[i + len(container_stats)].legend(loc='upper left')

# Inicializar contenedores (para verificar si hay datos al inicio)
container_stats = get_docker_stats()

# Si no hay contenedores, terminamos el script
if not container_stats:
    print("No se encontraron datos de contenedores.")
else:
    # Configuración de la figura y los subgráficos
    fig, axs = plt.subplots(2 * len(container_stats), 1, figsize=(10, len(container_stats) * 4))

    # Crear la animación
    ani = animation.FuncAnimation(fig, update_data, interval=2000)

    # Mostrar los gráficos
    plt.tight_layout()
    plt.show()
