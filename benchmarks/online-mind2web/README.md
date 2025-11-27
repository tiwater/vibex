# Online Mind2Web Benchmark

This directory contains the setup for the **Online Mind2Web** benchmark, which is used to evaluate the performance of web agents on real-world websites.

## Reference
- **Repository**: [OSU-NLP-Group/Online-Mind2Web](https://github.com/OSU-NLP-Group/Online-Mind2Web)
- **Paper**: [Online Mind2Web: A Comprehensive Benchmark for Online Web Agents](https://arxiv.org/abs/2406.06040)

## Comparison with Eko Framework

The Eko framework (v2.0) uses this benchmark and has reported the following scores. We aim to compare our agent's performance against these baselines.

| Difficulty | Eko Success Rate |
|------------|------------------|
| **Easy**   | 95%              |
| **Medium** | 76%              |
| **Hard**   | 70%              |
| **Overall**| **80%**          |

## Setup

1. Run the setup script to clone the benchmark repository and prepare the environment:
   ```bash
   ./setup.sh
   ```

2. Follow the instructions in the cloned `Online-Mind2Web` repository to run the evaluation.
