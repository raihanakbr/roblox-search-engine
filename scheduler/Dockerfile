FROM python:3.9-slim

# Install cron, tzdata and dos2unix (to fix line endings)
RUN apt-get update && apt-get -y install cron tzdata dos2unix

# Set timezone to WIB (Jakarta)
ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy crontab file and fix potential line ending issues
COPY crontab /etc/cron.d/rofind-cron
RUN dos2unix /etc/cron.d/rofind-cron

# Give execution permission to the crontab file
RUN chmod 0644 /etc/cron.d/rofind-cron

# Create the log file
RUN touch /var/log/cron.log && chmod 666 /var/log/cron.log

# Apply crontab directly with cat to avoid any formatting issues
RUN cat /etc/cron.d/rofind-cron | crontab -

# Create script that will be executed by cron
COPY run_pipeline.sh /app/
RUN dos2unix /app/run_pipeline.sh
RUN chmod +x /app/run_pipeline.sh

# Run cron in foreground
CMD ["cron", "-f"]