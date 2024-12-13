git reset HEAD~1
rm ./backport.sh
git cherry-pick 7fcde45d09f854a5aa211baa9559d9523bba271c
echo 'Resolve conflicts and force push this branch'
