class Aitelier < Formula
  desc "Your AI atelier - craft fine-tuned models"
  homepage "https://github.com/furkantanyol/aitelier"
  url "https://registry.npmjs.org/aitelier/-/aitelier-0.2.0.tgz"
  sha256 "a391146b87a26865a005f3e731c0df2a5d95ed48089514b672785e5034f5e927"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system bin/"ait", "--version"
    assert_match "0.2.0")
  end
end
