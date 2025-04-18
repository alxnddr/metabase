#!/bin/bash
# if nobody manually set a host to listen on then go with all available interfaces and host names
if [ -z "$MB_JETTY_HOST" ]; then
    export MB_JETTY_HOST=0.0.0.0
fi

# Setup Java Options
JAVA_OPTS="${JAVA_OPTS} -XX:+IgnoreUnrecognizedVMOptions"
JAVA_OPTS="${JAVA_OPTS} -Dfile.encoding=UTF-8"
JAVA_OPTS="${JAVA_OPTS} -Dlogfile.path=target/log"
JAVA_OPTS="${JAVA_OPTS} -XX:+CrashOnOutOfMemoryError"
JAVA_OPTS="${JAVA_OPTS} -server"
JAVA_OPTS="${JAVA_OPTS} --add-opens java.base/java.nio=ALL-UNNAMED"

if [ ! -z "$JAVA_TIMEZONE" ]; then
    JAVA_OPTS="${JAVA_OPTS} -Duser.timezone=${JAVA_TIMEZONE}"
fi

# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
# taken from https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh
# This is the specific function that takes the env var which has a "_FILE" at the end and transforms that into a normal env var.
file_env() {
    local var="$1"
    local fileVar="${var}_FILE"
    local def="${2:-}"
    if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
        echo >&2 "error: both $var and $fileVar are set (but are exclusive)"
        exit 1
    fi
    local val="$def"
    if [ "${!var:-}" ]; then
        val="${!var}"
    elif [ "${!fileVar:-}" ]; then
        val="$(< "${!fileVar}")"
    fi
    export "$var"="$val"
    unset "$fileVar"
}

# Here we define which env vars are the ones that will be supported with a "_FILE" ending. We started with the ones that would contain sensitive data
docker_setup_env() {
    file_env 'MB_DB_USER'
    file_env 'MB_DB_PASS'
    file_env 'MB_DB_CONNECTION_URI'
    file_env 'MB_EMAIL_SMTP_PASSWORD'
    file_env 'MB_EMAIL_SMTP_USERNAME'
    file_env 'MB_LDAP_PASSWORD'
    file_env 'MB_LDAP_BIND_DN'
}

# detect if the container is started as root or not
# if non-root, it's likely we run in a k8s environment with well maintained permissions
# if root, we need to check some permissions in order to exec metabase with a non-root user
# In that case, the container is run as root, metabase is run as a non-root user
# Also, we call the docker_setup_env function before Metabase starts so it takes the Docker secrets in case there are any
if [ $(id -u) -ne 0 ]; then
    # Launch the application
    # exec is here twice on purpose to  ensure that metabase runs as PID 1 (the init process)
    # and thus receives signals sent to the container. This allows it to shutdown cleanly on exit
    docker_setup_env
    exec /bin/sh -c "exec java $JAVA_OPTS -jar /app/metabase.jar $@"
else
    # Avoid running metabase (or any server) as root where possible
    # If you want to use specific user and group ids that matches an existing
    # account on the host pass them in $MGID and $MUID when starting metabase
    MGID=${MGID:-2000}
    MUID=${MUID:-2000}
    #
    ## create the group if it does not exist
    ## TODO: edit an existing group if MGID has changed
    getent group metabase > /dev/null 2>&1
    group_exists=$?
    if [ $group_exists -ne 0 ]; then
        addgroup --gid $MGID --system metabase
    fi

    # create the user if it does not exist
    # TODO: edit an existing user if MGID has changed
    id -u metabase > /dev/null 2>&1
    user_exists=$?
    if [[ $user_exists -ne 0 ]]; then
        adduser --disabled-password -u $MUID --ingroup metabase metabase
    fi

    db_file=${MB_DB_FILE:-/metabase.db}

    # In order to run metabase as a non-root user in docker, we need to handle various
    # cases where we where previously ran as root and have an existing database that
    # consists of a bunch of files, that are owned by root, sitting in a directory that
    # may only be writable by root. It's not safe to simply change the ownership or
    # permissions of an unknown directory that may be a volume mounted on the host, so
    # we will need to detect this and make a place that is going to be safe to set
    # permissions on.

    # So first some preliminary checks:

    # 1. Does this container have an existing H2 database file?
    # 2. or an existing H2 database in it's own directory,
    # 3. or neither?


    # is there a pre-existing files only database without a metabase specific directory?
    if ls $db_file\.* > /dev/null 2>&1; then
        db_exists=true
    else
        db_exists=false
    fi
    # is it an old style file
    if [[ -d "$db_file" ]]; then
        db_directory=true
    else
        db_directory=false
    fi

    # If the db exits, and it's just some files in a shared directory we could do
    # serious damage to peoples home or /tmp directories if we where to set the
    # permissions on that directory to allow metabase to create db-lock and db-part
    # file there. To keep them safe we make a new directory with the same name and
    # move the db file into the new directory. If we where passed the name of a
    # directory rather than a specific file, then we are safe to set permissions on
    # that directory so there is no need to move anything.

    # an example file would look like /tmp/metabase.db/metabase.db.mv.db
    new_db_dir=$(dirname $db_file)/$(basename $db_file)

    if [[ $db_exists = "true" && ! $db_directory = "true" ]]; then
        mkdir $new_db_dir
        mv $db_file\.* $new_db_dir/
    fi

    # and for the new install case we create the directory
    if [[ $db_exists = "false" && $db_directory = "false" ]]; then
        mkdir $new_db_dir
    fi

    # the case where the DB exists and is a directory, there is nothing to do
    # so nothing happens here. This will be the normal case.

    # next we tell metabase use the files we just moved into the directory
    # or create the files in that directory if they don't exist.
    docker_setup_env
    export MB_DB_FILE=$new_db_dir/$(basename $db_file)

    # TODO: print big scary warning if they are configuring an ephemeral instance

    chown metabase:metabase $new_db_dir $new_db_dir/* 2>/dev/null  # all that fussing makes this safe

    # Ensure JAR file is world readable
    chmod o+r /app/metabase.jar

    # Initialize the Metabase db from H2 dump, if available
    INITIAL_DB=$(ls /app/initial*.db 2> /dev/null | head -n 1)
    if [ -f "${INITIAL_DB}" ]; then
        echo "Initializing Metabase database from H2 database ${INITIAL_DB}..."
        chmod o+r ${INITIAL_DB}
        su metabase -s /bin/sh -c "exec java $JAVA_OPTS -jar /app/metabase.jar load-from-h2 ${INITIAL_DB%.mv.db} $@"

        if [ $? -ne 0 ]; then
            echo "Failed to initialize database from H2 database!"
            exit 1
        fi

        echo "Done."
    fi

    # Launch the application
    # exec is here twice on purpose to  ensure that metabase runs as PID 1 (the init process)
    # and thus receives signals sent to the container. This allows it to shutdown cleanly on exit
    exec su metabase -s /bin/sh -c "export JAVA_HOME=/opt/java/openjdk && export PATH=\$JAVA_HOME/bin:\$PATH && exec java $JAVA_OPTS -jar /app/metabase.jar $@"
fi
