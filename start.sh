#!/bin/bash
cd script
./start_dslc_senario.sh &
./start_frontend.sh &
./start_general_backend.sh &

echo "Services starting..."
sleep 3
open http://localhost:3000