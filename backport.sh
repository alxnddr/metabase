git reset HEAD~1
rm ./backport.sh
git cherry-pick a593f72374651d0b2612003511f2e0b42da80447
echo 'Resolve conflicts and force push this branch'
