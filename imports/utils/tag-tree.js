

export function TagTree(tree) {
  this.tree = tree;
  if (!this.leafs) {
    const leafs = [];
    tree.children.forEach((c) => {
      c.children.forEach((cc) => {
        cc.children.forEach((leaf) => {
          leafs.push({
            name: leaf.name, level1Name: c.name, level2Name: cc.name,
            path() {
              let result = '';
              if (this.level1Name !== '*') result += `${this.level1Name}/`;
              if (this.level2Name !== '*') result += `${this.level2Name}/`;
              return result;
            },
          });
        });
      });
    });
    this.leafs = leafs;
  }
  return this;
}


TagTree.prototype.leafFromName = function(leafName) {
    const result = this.leafs.find(l => l.name === leafName);
//    console.log(leafName, result, this.leafs);
    return result;
  };
  TagTree.prototype.leafIsParcel = function(leafName) {
    return ((this.name === 'Könyvelési helyek') && parseInt(leafName, 0));
  };
  TagTree.prototype.leafDisplay = function(leafName) {
    if (this.leafIsParcel(leafName)) return `${leafName}.${__('parcel')}`;
    return leafName;
  };
  TagTree.prototype.leafNames = function() {
    return this.leafs.map(l => l.name);
  };
  TagTree.prototype.leafDisplays = function() {
    return this.leafs.map(l => this.leafDisplay(l.name));
  };

TagTree.prototype.leafFullPathDisplay = function(leaf) {
    return `${leaf.path()}${this.leafDisplay(leaf.name)}`;
};

TagTree.prototype.leafOptions = function() {
  const self = this;
  return this.leafs.map(function option(leaf) {
    return { label: self.leafFullPathDisplay(leaf), value: leaf.name };
  });
};
