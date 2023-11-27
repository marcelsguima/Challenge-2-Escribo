#!/bin/bash

# wait-for-mysql.sh

set -e

host="$1"
shift
cmd="$@"

until mysql -h"$host" -P3306 -uroot -p654321 &> /dev/null
do
  echo "MySQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "MySQL is up - executing command"
exec $cmd