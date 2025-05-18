echo "Starting all RQ workers..."

# Set the environment variable for fork safety on macOS
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# Start workers in background (with &)
rq worker jd_analyse --with-scheduler --url redis://localhost:6379 &
rq worker resume_matching --with-scheduler --url redis://localhost:6379 &
rq worker questions_generator --with-scheduler --url redis://localhost:6379 &

# Wait so the script doesn't exit
wait