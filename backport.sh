git reset HEAD~1
rm ./backport.sh
git cherry-pick 050ba9bec4007888d6be11c39c339d97971b33e5
echo 'Resolve conflicts and force push this branch'
